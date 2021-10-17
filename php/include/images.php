<?php

//############################################################
//# File:    images.php                                      #
//# Created: 2003-12-25                                      #
//# Author:  Patrik Sjokvist                                 #
//# -------------------------------------------------------- #
//# Modification History:                                    #
//# =====================                                    #
//# Date        By      Description                          #
//# ----------  ------  ------------------------------------ #
//# 2003-12-25  PatSjo  Initial version                      #
//# 2013-11-01  PatSjo  Changes from ASP to PHP              #
//############################################################

class Images
{
  public const BUFFERSIZE = 65536;
  public const itUNKNOWN  = 0;
  public const itGIF      = 1;
  public const itJPEG     = 2;
  public const itPNG      = 3;
  public const itBMP      = 4;

  private $m_Width = 0;
  private $m_Height = 0;
  private $m_Depth = 0;
  private $m_ImageType = self::itUNKNOWN;

  private function Mult ($lsb, $msb)
  {
    return lsb + (msb * 256);
  }

  public function Width()
  {
    return $this->m_Width;
  }

  public function Height()
  {
    return $this->m_Height;
  }

  public function Depth()
  {
    return $this->m_Depth;
  }

  public function ImageType()
  {
    return $this->m_ImageType;
  }

  public function ReadImageInfo(&iByteArray)

    $this->m_Width = 0;
    $this->m_Height = 0;
    $this->m_Depth = 0;
    $this->m_ImageType = self::itUNKNOWN;

    If (AscB(MidB(iByteArray,1,1)) = 137) And (AscB(MidB(iByteArray,2,1)) = 80) And (AscB(MidB(iByteArray,3,1)) = 78) Then

      ' this is a PNG file

      m_ImageType = itPNG

      ' get bit depth
      Select Case AscB(MidB(iByteArray,26,1))
        Case 0
          ' greyscale
          m_Depth = AscB(MidB(iByteArray,25,1))

        Case 2
          ' RGB encoded
          m_Depth = AscB(MidB(iByteArray,25,1)) * 3

        Case 3
          ' Palette based, 8 bpp
          m_Depth = 8

        Case 4
          ' greyscale with alpha
          m_Depth = AscB(MidB(iByteArray,25,1)) * 2

        Case 6
          ' RGB encoded with alpha
          m_Depth = AscB(MidB(iByteArray,25,1)) * 4

        Case Else
          ' This value is outside of it's normal range, so
          ' we'll assume that this is not a valid file
          m_ImageType = itUNKNOWN

      End Select

      If (m_ImageType) Then
        ' if the image is valid then

        ' get the width
        m_Width = Mult(AscB(MidB(iByteArray,20,1)), AscB(MidB(iByteArray,19,1)))

        ' get the height
        m_Height = Mult(AscB(MidB(iByteArray,24,1)), AscB(MidB(iByteArray,23,1)))
      End If
    End If

    If (AscB(MidB(iByteArray,1,1)) = 71) And (AscB(MidB(iByteArray,2,1)) = 73) And (AscB(MidB(iByteArray,3,1)) = 70) Then

      ' this is a GIF file

      m_ImageType = itGIF

      ' get the width
      m_Width = Mult(AscB(MidB(iByteArray,7,1)), AscB(MidB(iByteArray,8,1)))

      ' get the height
      m_Height = Mult(AscB(MidB(iByteArray,9,1)), AscB(MidB(iByteArray,10,1)))

      ' get bit depth
      m_Depth = (AscB(MidB(iByteArray,11,1)) And 7) + 1
    End If
    
    If (AscB(MidB(iByteArray,1,1)) = 66) And (AscB(MidB(iByteArray,2,1)) = 77) Then

      ' this is a BMP file

      m_ImageType = itBMP

      ' get the width
      m_Width = Mult(AscB(MidB(iByteArray,19,1)), AscB(MidB(iByteArray,20,1)))

      ' get the height
      m_Height = Mult(AscB(MidB(iByteArray,23,1)), AscB(MidB(iByteArray,24,1)))

      ' get bit depth
      m_Depth = AscB(MidB(iByteArray,29,1))
    End If

    If m_ImageType = itUNKNOWN Then

      ' if the file is not one of the above type then
      ' check to see if it is a JPEG file

      Dim lPos

      Do
        ' loop through looking for the byte sequence FF,D8,FF
        ' which marks the begining of a JPEG file
        ' lPos will be left at the postion of the start

        If (AscB(MidB(iByteArray,lpos+1,1)) = &HFF And AscB(MidB(iByteArray,lpos+2,1)) = &HD8 _  
           And AscB(MidB(iByteArray,lpos+3,1)) = &HFF) _
           Or (lPos >= BUFFERSIZE - 10) Then Exit Do

        lPos = lPos + 1

      Loop

      lPos = lPos + 2

      If lPos >= BUFFERSIZE - 10 Then Exit Sub

      Do
        ' loop through the markers until we find the one 
        'starting with FF,C0 which is the block containing the 
        'image information

        Do
          ' loop until we find the beginning of the next marker

          If AscB(MidB(iByteArray,lpos+1,1)) = &HFF And AscB(MidB(iByteArray,lpos+2,1)) <> &HFF Then Exit Do

          lPos = lPos + 1

          If lPos >= BUFFERSIZE - 10 Then Exit Sub
        Loop

        ' move pointer up
        lPos = lPos + 1

        Select Case AscB(MidB(iByteArray,lpos+1,1))

          ' Case &HC0 To &HC3, &HC5 To &HC7, &HC9 To &HCB, &HCD To &HCF
          Case &HC0, &HC1, &HC2, &HC3, &HC5, &HC6, &HC7, &HC9, &HCA, &HCB, &HCD, &HCE, &HCF
            ' we found the right block
            Exit Do
        End Select

        ' otherwise keep looking
        lPos = lPos + Mult(AscB(MidB(iByteArray,lpos+3,1)), AscB(MidB(iByteArray,lpos+2,1)))

        ' check for end of buffer
        If lPos >= BUFFERSIZE - 10 Then Exit Sub

      Loop

      ' If we've gotten this far it is a JPEG and we are ready
      ' to grab the information.

      m_ImageType = itJPEG

      ' get the height
      m_Height = Mult(AscB(MidB(iByteArray,lpos+6,1)), AscB(MidB(iByteArray,lpos+5,1)))

      ' get the width
      m_Width = Mult(AscB(MidB(iByteArray,lpos+8,1)), AscB(MidB(iByteArray,lpos+7,1)))

      ' get the color depth
      m_Depth = AscB(MidB(iByteArray,lpos+9,1)) * 8

    End If
    
  End Sub

End Class


</SCRIPT>